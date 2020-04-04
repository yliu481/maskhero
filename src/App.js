import React, { useState, useEffect, useLayoutEffect } from "react";
import _ from "lodash";
import  moment from "moment";

// 引入样式
import "./assets/styles/common.scss";
import "./assets/styles/app.scss";

// 图片资源、金数据
import {images, JINSHUJU} from "./utils/contants"

// 接口请求
import * as request from './request'

// utils
import { buildChart } from "./utils/chartUtils";
import { WXShare, getCountryName, getCityName } from "./utils";

// 轮播插件
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// 预览插件
import Carousel, { Modal, ModalGateway } from "react-images";
// 地图插件
import * as am4core from "@amcharts/amcharts4/core";
import * as am4maps from "@amcharts/amcharts4/maps";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
am4core.useTheme(am4themes_animated);

// TODO: workaround
const TEMP_ENDPOINT = "/forms/Ukw1aQ/entries";

const App = () => {
  const [chart, setChart] = useState();
  const [maskCount, setMaskCount] = useState(0);
  const [money, setMoney] = useState(0);
  const [helpCount, setHelpCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [domesticData, setDomesticData] = useState([]);
  const [foreignData, setForeignData] = useState([]);
  const [volunteerData, setVolunteerData] = useState([]);
  const [donatorData, setDonatorData] = useState([]);
  const [sponserData, setSponserData] = useState([]);
  const [highlightData, setHighLightData] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [shareModalIsOpen, setShareModalIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredData, setFilteredData] = useState([]);
  const [supportInfoList, setSupportInfoList] = useState([]);

  const toggleModal = (index) => {
    setModalIsOpen(!modalIsOpen);
    setSelectedIndex(index);
  };

  const delta = 6;
  let startX;
  let startY;
  let drag = false;
  const handleTouchStart = (event) => {
    drag = false;
    startX = event.pageX;
    startY = event.pageY;
  };

  const handleTouchMove = (event) => {
    drag = true;
  };

  const handleTouchEnd = (event, index) => {
    const diffX = Math.abs(event.pageX - startX);
    const diffY = Math.abs(event.pageY - startY);
    if (diffX < delta && diffY < delta) {
      toggleModal(index);
    }
  };

  const carouselSettings = {
    dots: true,
    infinite: true,
    initialSlide: 0,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  useLayoutEffect(() => {
    if (
      domesticData.length > 0 &&
      foreignData.length > 0 &&
      volunteerData.length > 0
    ) {
      const chart = am4core.create("chartdiv", am4maps.MapChart);
      buildChart(chart, domesticData, foreignData, volunteerData);
      setChart(chart);
    }
    return () => {
      chart && chart.dispose();
    };
  }, [domesticData, foreignData, volunteerData]);


  useEffect(() => {
    //微信分享
    WXShare();
    
    // 获取国内物资援助数据
    request.getDomesticData()
    .then((response) => {
      let { data } = response;
      data = data.filter((d) => d["field_12"] === "已审核");
      setDomesticData(data);
      setMaskCount(
        data.reduce((total, currentValue) => {
          // field_10 means masks
          return total + currentValue["field_10"];
        }, 0)
      );
    })
    .catch((error) => console.log(error));

    // 获取国外反馈数据
    const getForeigns = (tmpData = [], next = "") => {
      request.getForeignData(next)
      .then(response=> {
        let { data, next } = response;
        let newData = tmpData.concat(data);
        setForeignData(newData);
        setHelpCount(newData.length);
        setFilteredData(newData.filter((r) => !_.isEmpty(r.field_7)));
        if (next) {
          getForeigns(newData, next);
        }
        // TODO: workaround to combine two api data into one
      })
      .catch((error) => console.log(error));
    };
    getForeigns(foreignData);

    // 获取自愿者数据
    request.getVolunteerData()
    .then((response) => {
      let { data } = response;
      data = data.filter((d) => d["field_18"] === "已通过");
      setVolunteerData(data);
      setVolunteerCount(data.length);
    })
    .catch((error) => console.log(error));

    // 获取捐赠者数据
    const getDonators = (tmpData = [], next = "") => {
      request.getDonatorData(next)
      .then((response) => {
          let { data, next } = response;
          const newData = tmpData.concat(data).filter((d) => d["field_13"] === "已审核");
          setDonatorData(newData.reverse());
          setMoney(
            newData.reduce((total, currentValue) => {
              return total + currentValue["field_12"];
            }, 0)
          );
          if (next) {
            getDonators(newData, next);
          }
        })
        .catch((error) => console.log(error));
    };
    getDonators(donatorData);

    // 获取赞助商
    request.getSponserData()
    .then((response) => {
      let { data } = response;
      data = data.filter((d) => d["field_12"] === "已审核");
      setSponserData(data);
    })
    .catch((error) => console.log(error));

    // 获取留声机
    request.getHighLightData()
    .then((response) => {
      let { data } = response;
      data = data.filter((d) => d["field_12"] === "已审核");
      setHighLightData(data);
    })
    .catch((error) => console.log(error));
  }, []);

  // For donator table scrolling effect
  useEffect(() => {
    const donatorWrapper = document.querySelector("#donator-wrapper");
    const donatorTable = document.querySelector(".info-table");

    const requesterWrapper = document.querySelector("#requester-wrapper");

    const donatorScroll = () => {
      // When donator list is scrolled to the end, the cycle will restart
      if (donatorWrapper.scrollTop >= 0.5 * donatorTable.scrollHeight) {
        donatorWrapper.scrollTop -= 0.5 * donatorTable.scrollHeight;
      } else {
        // console.log(donatorWrapper.scrollTop, donatorTable.scrollHeight);
        donatorWrapper.scrollTop++;
      }
    };

    const requesterScroll = () => {
      // When requester messages are scrolled to the end, the cycle will restart
      if (requesterWrapper.scrollTop >= 0.5 * requesterWrapper.scrollHeight) {
        requesterWrapper.scrollTop -= 0.5 * requesterWrapper.scrollHeight;
      } else {
        // console.log(requesterWrapper.scrollTop, requesterWrapper.scrollHeight);
        requesterWrapper.scrollTop++;
      }
    };
    // Set a timer for the scrolling effect
    let d = setInterval(donatorScroll, 20);
    let r = setInterval(requesterScroll, 20);

    //When mouseover event is triggered, stop table from scrolling
    donatorWrapper.addEventListener("mouseover", () => clearInterval(d), false);
    requesterWrapper.addEventListener(
      "mouseover",
      () => clearInterval(r),
      false
    );
    //When mouseout event is triggered, continue scrolling
    donatorWrapper.addEventListener(
      "mouseout",
      () => {
        d = setInterval(donatorScroll, 20);
      },
      false
    );
    requesterWrapper.addEventListener(
      "mouseout",
      () => {
        r = setInterval(requesterScroll, 20);
      },
      false
    );
  }, []);

  // const supportInfoList = [];
  const list = [];
  donatorData.forEach((data) => {
    list.push({
      name: data["field_1"],
      content: `捐赠了 ${data["field_12"]} 人民币`,
      createdAt: data["created_at"],
    });
  });

  domesticData.forEach((data) => {
    list.push({
      name: data["field_1"],
      content: `捐赠了 ${data["field_5"][0]} ${data["field_10"]} 个`,
      createdAt: data["created_at"],
    });
  });

  list.sort(function (a, b) {
    a = new Date(a.createdAt);
    b = new Date(b.createdAt);
    return a > b ? -1 : a < b ? 1 : 0;
  });

  const volunteerList = volunteerData.map((data) => (
    <div className="avatar">
      <img
        src={
          data["x_field_weixin_headimgurl"].replace("http://", "https://") ||
          images.avatar
        }
        alt="avatar"
      />
      <div className="overlay">
        <div className="text">{data["field_1"]}</div>
      </div>
    </div>
  ));

  const hightlightList = [];
  let imagesTemp = [];
  highlightData.forEach((data, index) => {
    if (index % 4 === 0) {
      imagesTemp = [
        <img style={{ opacity: 0 }} src="" alt="empty" />,
        <img style={{ opacity: 0 }} src="" alt="empty" />,
        <img style={{ opacity: 0 }} src="" alt="empty" />,
        <img style={{ opacity: 0 }} src="" alt="empty" />,
      ];
    }
    imagesTemp[index % 4] = (
      <div
        style={{
          backgroundImage: `url(${data["field_11"][0]})`,
          // width: "18vw",
          // height: "18vw",
          backgroundSize: "cover",
        }}
        className="carousel-img"
        src={data["field_11"][0]}
        alt="empty"
        onTouchStart={handleTouchStart}
        onMouseDown={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseMove={handleTouchMove}
        onTouchEnd={(e) => {
          handleTouchEnd(e, index);
        }}
        onMouseUp={(e) => {
          handleTouchEnd(e, index);
        }}
      ></div>
    );
    if (index % 4 === 3 || index === highlightData.length - 1) {
      hightlightList.unshift(
        <div key={`hl-${index}`} className="carousel-images">
          {imagesTemp}
        </div>
      );
    }
  });

  const imageCa = highlightData.map((h) => {
    return { source: h["field_11"][0] };
  });

  return (
    <div className="app">
      <div
        className={`shareModal ${shareModalIsOpen ? "open" : ""}`}
        onClick={(e) => {
          document.body.classList.remove("modal-open");
          setShareModalIsOpen(false);
        }}
      >
        <div className="sharethis-inline-share-buttons"></div>
        <div className="share-mb">
          <p>请点击右上角</p>
          <p>将它发送给指定朋友</p>
          <p>或分享到朋友圈</p>
        </div>
      </div>

      <header className="header">
        <img src={images.logo} className="logo" alt="logo" />
        <img src={images.logomb} className="logo-mb" alt="logo" />
        <img src={images.title} className="title" alt="title" />
        <h1>海外的亲们，是时候让我们陪你们打下半场了！</h1>
        <div className="bar-mb"></div>
        <p>
          这场疫情，国内打上半场，国外打下半场，海外华人打全场。”这话于国内的我们而言是段子，于国外的你们是猝不及防的遭遇。
          在倾力支援国内之后，异国他乡的土地上的你们，除了对抗病毒本身，还要替我们承受“Chinese
          Virus”的污名乃至这背后的威胁、暴力。
        </p>
        <p className="second">
          这一切，国内的亲们，不会坐视。岂曰无衣，与子同袍！我们一起来打下半场。
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://eleduck.com/posts/6XNfOL"
          >
            点此查看我们正在做的>>>
          </a>
        </p>
        <div className="wrapper">
          <div className="tile">
            <div className="name">援助口罩</div>
            <div className="data">
              {/* {maskCount} */}
              {2000}
              <span className="unit">个</span>
            </div>
          </div>
          <div className="split"></div>
          <div className="tile">
            <div>收到捐款</div>
            <div className="data">
              <span>{money}</span>
              {/* <span>{5180}</span> */}
              <span className="unit">元</span>
            </div>
          </div>
          <div className="split"></div>
          <div className="tile">
            <div>援助华人家庭</div>
            <div className="data">
              {/* {helpCount} */}
              {200}
              <span className="unit">个</span>
            </div>
          </div>
          <div className="split"></div>
          <div className="tile">
            <div>志愿者</div>
            <div className="data">
              {volunteerCount}
              {/* {18} */}
              <span className="unit">人</span>
            </div>
          </div>
          <div className="split"></div>
          <div className="tile">
            <div>援助海外城市</div>
            <div className="data">
              <span>4</span>
              <span className="unit">个</span>
            </div>
          </div>
        </div>
        <img className="arrow" src={images.vector} alt="arrow"></img>
      </header>

      <div className="wrapper-mb">
        <h1>截止目前为止，我们已经</h1>
        <div className="tile">
          <div className="name">援助口罩</div>
          <div className="data">
            {2000}
            {/* {maskCount} */}
            <span className="unit">个</span>
          </div>
        </div>
        <div className="split"></div>
        <div className="tile">
          <div className="name">收到捐款</div>
          <div className="data">
            <span>{money}</span>
            {/* <span>{5180}</span> */}
            <span className="unit">元</span>
          </div>
        </div>
        <div className="split"></div>
        <div className="tile">
          <div className="name">援助华人家庭</div>
          <div className="data">
            {/* {helpCount} */}
            {200}
            <span className="unit">个</span>
          </div>
        </div>
        <div className="split"></div>
        <div className="tile">
          <div className="name">志愿者</div>
          <div className="data">
            {volunteerCount}
            <span className="unit">人</span>
          </div>
        </div>
        <div className="split"></div>
        <div className="tile">
          <div className="name">援助海外城市</div>
          <div className="data">
            <span>4</span>
            <span className="unit">个</span>
          </div>
        </div>
      </div>

      <section className="support">
        <h1>援助地图</h1>
        <p className="text">
          我们正在以城市为单位，接收海外华人的援助申请，同时在国内募集物资，实施援助。
        </p>
        <div id="chartdiv"></div>
        <div className="legend">
          <div className="marker">
            <div className="color color-1"></div>
            <div className="text">已援助</div>
          </div>
          <div className="marker">
            <div className="color color-2"></div>
            <div className="text">未援助</div>
          </div>
        </div>
        <div className="info">
          <div className="row-1">
            <a
              className="btn-mb"
              rel="noopener noreferrer"
              href="#helpus"
              type="button"
            >
              提供援助
            </a>
            <div id="donator-wrapper" className="w60">
              <table className="info-table">
                <tbody>
                  {list.map((data, index) => (
                    <tr key={`donator-${index}`}>
                      <td>{data.name}</td>
                      <td>{data.content}</td>
                      <td>{moment(data.createdAt).format("YYYY年MM月DD日")}</td>
                      {/* <td>{data.createdAt}</td> */}
                    </tr>
                  ))}
                  {/* Repeat the list to make sure the infinite scrolling effect */}
                  {list.map((data, index) => (
                    <tr key={`donator-repeat-${index}`}>
                      <td>{data.name}</td>
                      <td>{data.content}</td>
                      <td>{moment(data.createdAt).format("YYYY年MM月DD日")}</td>
                      {/* <td>{data.createdAt}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w40 dt support-column">
              <p>我们目前急需口罩和采购口罩的资金。多少不限，请勿坐视。</p>
              <a
                className="btn"
                rel="noopener noreferrer"
                href="#helpus"
                type="button"
              >
                提供援助
              </a>
            </div>
          </div>
          <div className="row-2">
            <div className="w40">
              <p>
                凡华人组织和个人都可以通过这里申请口罩援助，我们会认真对待每一条申请。
              </p>
              <a
                className="btn"
                target="_blank"
                rel="noopener noreferrer"
                // href={JINSHUJU.FOREIGN_FORM_LINK}
                href={"https://jinshuju.net/f/sIDktA"}
                type="button"
              >
                申请援助
              </a>
            </div>
            <div id="requester-wrapper" className="align-right w60">
              {filteredData.map((data) => (
                <div className="requester">
                  <div className="content">{data["field_7"]}</div>
                  <div className="requester-info">
                    <p>{`${data["field_11"]}`}</p>
                    <p>{`${getCountryName(data["field_13"])}-${getCityName(
                      data["field_15"]
                    )}`}</p>
                  </div>
                </div>
              ))}
              {/* Repeat the message list to make sure the infinite scrolling effect */}
              {filteredData.map((data) => (
                <div className="requester">
                  <div className="content">{data["field_7"]}</div>
                  <div className="requester-info">
                    <p>{`${data["field_11"]}`}</p>
                    <p>{`${getCountryName(data["field_13"])}-${getCityName(
                      data["field_15"]
                    )}`}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb">
              <p>
                凡华人组织和个人都可以通过这里申请口罩援助，我们会认真对待每一条申请。
              </p>
              <a
                className="btn"
                target="_blank"
                rel="noopener noreferrer"
                // href={JINSHUJU.FOREIGN_FORM_LINK}
                href={"https://jinshuju.net/f/sIDktA"}
                type="button"
              >
                申请援助
              </a>
              <a
                className="btn-mb"
                target="_blank"
                rel="noopener noreferrer"
                // href={JINSHUJU.FOREIGN_FORM_LINK}
                href={"https://jinshuju.net/f/sIDktA"}
                type="button"
              >
                申请援助
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="highlights">
        <h1>爱的留声机</h1>
        <p className="text">这里，是我们随手记录的一些真实瞬间。</p>
        <Slider className="carousel-dt" {...carouselSettings}>
          {hightlightList}
        </Slider>
        <Slider className="carousel-mb" {...carouselSettings}>
          {highlightData.map((data, index) => (
            <div className="carousel-images">
              <div
                style={{
                  backgroundImage: `url(${data["field_11"][0]})`,
                  // width: "18vw",
                  // height: "18vw",
                  backgroundSize: "cover",
                }}
                className="carousel-img"
                src={data["field_11"][0]}
                alt="empty"
                onTouchStart={handleTouchStart}
                onMouseDown={handleTouchStart}
                onTouchMove={handleTouchMove}
                onMouseMove={handleTouchMove}
                onTouchEnd={(e) => {
                  handleTouchEnd(e, index);
                }}
                onMouseUp={(e) => {
                  handleTouchEnd(e, index);
                }}
              ></div>
            </div>
          ))}
        </Slider>
        <ModalGateway>
          {modalIsOpen ? (
            <Modal onClose={toggleModal}>
              <Carousel currentIndex={selectedIndex} views={imageCa} />
            </Modal>
          ) : null}
        </ModalGateway>
        <div className="volunteers">
          <div className="column left">
            <h2>默默付出着的志愿者们</h2>
            <p>
              坦诚的讲，做这样的公益太累了。如果没有这帮志愿者的陆续加入，我和@Char根本坚持不下来。
            </p>
            <p>要感谢的人太多，但我更想对这些同志们说——辛苦了！</p>
            <p>Respect!</p>
            <a
              className="btn"
              target="_blank"
              rel="noopener noreferrer"
              href={JINSHUJU.VOLUNTEER_FORM_LINK}
              type="button"
            >
              加入我们
            </a>
          </div>
          <div className="column right">{volunteerList}</div>
          <a
            className="btn-mb"
            target="_blank"
            rel="noopener noreferrer"
            href={JINSHUJU.VOLUNTEER_FORM_LINK}
            type="button"
          >
            加入我们
          </a>
        </div>
      </section>

      <section className="sponsers">
        <h1>值得尊敬的伙伴们</h1>
        <p className="text">
          与子偕行，共赴国殇！这次行动中，以下这些无私有爱的合作伙伴们，也在发光发热。
        </p>
        <div>
          {sponserData.map((sponser) => (
            <img className="sponser" src={sponser["field_11"][0]} alt="icbc" />
          ))}
        </div>
        <center>
          <span>
            我们的力量总归有限，真心的邀请其他公司/组织/品牌/等合作共建，帮助到更多的海外华人。
          </span>
          <a
            className="btn"
            target="_blank"
            rel="noopener noreferrer"
            href={JINSHUJU.SPONSER_FORM_LINK}
            type="button"
          >
            合作联系
          </a>
        </center>
      </section>

      <section className="helpus" id="helpus">
        <h1>希望您能这样帮助我们</h1>
        <p className="text">我们每个人的顺手贡献，都将漂洋过海，温暖人心</p>
        <div className="qrcodes">
          <div className="qrcode">
            <img src={images.icon1} alt="qrcode" />
            <p>不在多少，但求有心</p>
            <a
              className="btn"
              target="_blank"
              rel="noopener noreferrer"
              href={JINSHUJU.DONATOR_FORM_LINK}
              type="button"
            >
              爱心捐赠
            </a>
          </div>
          <div className="qrcode">
            <img src={images.icon2} alt="qrcode" />
            <p>不在多少，但求有心</p>
            <a
              className="btn"
              target="_blank"
              rel="noopener noreferrer"
              href={JINSHUJU.DOMESTIC_FORM_LINK}
              type="button"
            >
              爱心捐物
            </a>
          </div>
          <div className="qrcode">
            <img src={images.icon3} alt="qrcode" />
            <p>转发就是很好的支持</p>
            <button
              className="btn"
              onClick={() => {
                document.body.classList.add("modal-open");
                setShareModalIsOpen(true);
              }}
            >
              分享
            </button>
          </div>
          <div className="qrcode">
            <img src={images.icon4} alt="qrcode" />
            <p>如果你是开发者</p>
            <a
              className="btn"
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/eleduck/maskhero"
              type="button"
            >
              参与开源
            </a>
          </div>
        </div>
      </section>

      <footer>
        <img src={images.footerImg} alt="footer" />
        <center>Eleduck.com With Love.</center>
      </footer>
    </div>
  );
};

export default App;
