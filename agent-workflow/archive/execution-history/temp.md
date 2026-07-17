**I. THÔNG TIN CHUNG**  
1. Tên đề tài  

* Tên tiếng Việt: Nghiên cứu thiết kế hệ thống xử lý đơn hàng chịu tải cao theo kiến trúc hướng sự kiện  

* Tên tiếng Anh: Design of a High-Load Order Processing System Using an Event-Driven Architecture  

2. Lĩnh vực nghiên cứu  

* Kiến trúc phần mềm hướng dịch vụ vi mô và hệ thống phân tán.  
* Nền tảng thông điệp và mô hình giao tiếp bất đồng bộ.  
* Các cơ chế đảm bảo độ tin cậy trong hệ thống phân tán như Transactional Outbox, Idempotent Consumer và Retry với chiến lược tăng dần thời gian chờ.  

3. Loại hình nghiên cứu  

* Nghiên cứu ứng dụng, tập trung vào thiết kế, triển khai và đánh giá thực nghiệm trên hệ thống phần mềm.  
* Kết hợp nghiên cứu lý thuyết thông qua tài liệu của AWS, Google Cloud cùng các tài liệu chuyên ngành của Chris Richardson và Martin Fowler với nghiên cứu thực nghiệm định lượng trên hệ thống prototype.  

**II. NỘI DUNG THUYẾT MINH**  
1. Tính cấp thiết của đề tài  
Kiến trúc xử lý đồng bộ truyền thống thường tạo ra sự phụ thuộc chặt chẽ giữa các dịch vụ trong hệ thống. Khi quy mô hệ thống tăng lên và số lượng yêu cầu xử lý đồng thời ngày càng lớn, mô hình này dễ xuất hiện hiện tượng thắt nút cổ chai, đồng thời lỗi phát sinh tại một thành phần có thể lan truyền và ảnh hưởng đến toàn bộ hệ thống.  
Kiến trúc hướng sự kiện được xem là một giải pháp hiệu quả nhằm khắc phục những hạn chế trên thông qua việc tách rời các dịch vụ bằng một tầng trung gian truyền tải sự kiện. Theo các tài liệu kiến trúc của AWS, việc sử dụng bộ định tuyến sự kiện giúp cô lập lỗi giữa các thành phần và hỗ trợ hấp thụ tải đột biến một cách linh hoạt. Google Cloud cũng chỉ ra rằng mỗi dịch vụ trong kiến trúc hướng sự kiện có thể được mở rộng độc lập theo nhu cầu sử dụng thực tế mà không ảnh hưởng đến các thành phần còn lại của hệ thống.  
Tuy nhiên, những lợi ích này đi kèm với nhiều thách thức mới trong thiết kế hệ thống phân tán. Một trong những vấn đề quan trọng là việc ghi dữ liệu vào cơ sở dữ liệu và phát sự kiện ra hệ thống thông điệp không thể thực hiện trong cùng một giao dịch cục bộ, từ đó làm phát sinh nguy cơ mất đồng bộ giữa dữ liệu nghiệp vụ và dữ liệu sự kiện. Ngoài ra, do cơ chế phân phối thông điệp trong nhiều nền tảng hướng sự kiện ưu tiên khả năng đảm bảo phân phối, cùng một sự kiện có thể được phát lại nhiều lần trong quá trình xử lý. Trạng thái dữ liệu trong hệ thống phân tán thường chỉ đạt được tính nhất quán cuối cùng thay vì được đồng bộ ngay lập tức giữa các thành phần.  
Để giải quyết các vấn đề này, các hệ thống thực tế thường sử dụng kết hợp các cơ chế Transactional Outbox, Idempotent Consumer và Retry nhằm đảm bảo dữ liệu không bị thất thoát và có thể phục hồi sau sự cố. Tuy nhiên, phần lớn tài liệu hiện nay mới dừng lại ở mức mô tả nguyên lý hoạt động của các cơ chế trên mà chưa có nhiều nghiên cứu định lượng về chi phí hiệu năng mà chúng tạo ra trong quá trình vận hành thực tế.  
Việc áp dụng Transactional Outbox làm phát sinh thêm thao tác ghi dữ liệu và một tiến trình trung gian chịu trách nhiệm chuyển tiếp sự kiện tới hệ thống thông điệp. Tương tự, cơ chế xử lý bất biến yêu cầu thực hiện thêm thao tác kiểm tra nhằm phát hiện các sự kiện đã được xử lý trước đó. Những chi phí bổ sung này có thể ảnh hưởng trực tiếp tới thông lượng xử lý và độ trễ của hệ thống khi vận hành dưới tải cao. Đồng thời, mức độ cải thiện về độ tin cậy mà các cơ chế này mang lại trong điều kiện sự cố vẫn chưa có nhiều số liệu thực nghiệm cụ thể.  
Xuất phát từ thực tế đó, đề tài tập trung nghiên cứu và định lượng mối quan hệ đánh đổi giữa hiệu năng và độ tin cậy trong hệ thống xử lý đơn hàng sử dụng kiến trúc hướng sự kiện.  

2. Mục tiêu nghiên cứu  
**Mục tiêu tổng quát**  
Định lượng chi phí hiệu năng của các cơ chế đảm bảo độ tin cậy trong kiến trúc hướng sự kiện và đánh giá mức độ đảm bảo mà các cơ chế này mang lại khi hệ thống gặp sự cố thông qua một hệ thống xử lý đơn hàng thực nghiệm.  

**Câu hỏi nghiên cứu**  

* RQ1: Bộ cơ chế Transactional Outbox, Idempotent Consumer và Retry gây ra mức suy giảm bao nhiêu phần trăm về thông lượng và độ trễ so với hệ thống hướng sự kiện không sử dụng các cơ chế đảm bảo này.  

* RQ2: Khi hệ thống gặp sự cố như dịch vụ tiêu thụ ngừng hoạt động, hệ thống thông điệp bị gián đoạn hoặc cơ sở dữ liệu phản hồi chậm, mức độ đảm bảo thực tế mà hệ thống đạt được là gì thông qua các chỉ số như tỷ lệ mất đơn, tỷ lệ xử lý trùng lặp và thời gian phục hồi.  

* RQ3: Trong các cơ chế đảm bảo được sử dụng, thành phần nào tạo ra chi phí lớn nhất và còn khả năng tối ưu đến mức nào.  

**Mục tiêu cụ thể**  

1. Tổng hợp cơ sở lý thuyết về kiến trúc hướng sự kiện, bài toán đồng bộ giữa cơ sở dữ liệu và hệ thống thông điệp, các cơ chế Transactional Outbox, Idempotent Consumer, Retry, Dead Letter Queue và mô hình nhất quán cuối cùng.  
2. Phân tích nghiệp vụ xử lý đơn hàng nhiều bước và xác định các bất biến nghiệp vụ dùng làm tiêu chí đánh giá tính đúng đắn của hệ thống.  
3. Thiết kế kiến trúc hệ thống xử lý đơn hàng theo mô hình hướng sự kiện với khả năng bật hoặc tắt từng cơ chế đảm bảo nhằm phục vụ cho việc đo lường và so sánh.  
4. Triển khai hệ thống prototype trên môi trường container hóa có khả năng tái lập hoàn toàn, đồng thời xây dựng luồng xử lý đồng bộ tối thiểu làm đường tham chiếu.  
5. Thiết kế và thực hiện các nhóm thực nghiệm nhằm đánh giá chi phí hiệu năng trong điều kiện bình thường và mức độ đảm bảo trong điều kiện có sự cố.  
6. Phân tích kết quả thực nghiệm và đề xuất các khuyến nghị thiết kế dựa trên số liệu thu được.  

3. Đối tượng và phạm vi nghiên cứu  
**Đối tượng nghiên cứu**  
Chi phí hiệu năng và mức độ đảm bảo của các cơ chế độ tin cậy trong hệ thống xử lý đơn hàng dựa trên kiến trúc hướng sự kiện.  

**Phạm vi nghiên cứu**  

* Apache Kafka được lựa chọn làm nền tảng truyền tải sự kiện, được triển khai dưới dạng cụm nhiều broker trên môi trường Kubernetes hoặc k3s.  
* Hệ thống được triển khai phân tán trên nhiều node, các service có khả năng nhân bản và phân phối trên các node độc lập.  
* Hệ thống tập trung vào các dịch vụ nghiệp vụ cốt lõi gồm Order Service, Payment Service và Inventory Service.  
* Hệ thống đọc được xây dựng theo mô hình CQRS ở mức đơn giản thông qua cơ chế projection phục vụ cho API tra cứu trạng thái đơn hàng.  
* Luồng xử lý đồng bộ chỉ được xây dựng ở mức tối thiểu nhằm đóng vai trò là đường tham chiếu trong quá trình đánh giá.  

**Nội dung không thuộc phạm vi nghiên cứu**  

* Event Sourcing chỉ được trình bày trong phần cơ sở lý thuyết và định hướng phát triển trong tương lai.  
* Saga và các cơ chế giao dịch bù trừ chỉ được đề cập ở mức lý thuyết.  
* Đề tài không bao gồm giao diện người dùng, tích hợp cổng thanh toán thực tế hoặc triển khai trên nền tảng điện toán đám mây thương mại.  

Việc lựa chọn Kubernetes hoặc k3s cùng cụm Kafka nhiều broker nhằm đảm bảo hệ thống phản ánh đúng đặc trưng của môi trường phân tán thực tế, cho phép kiểm soát các biến số, tái lập thí nghiệm và thực hiện các kịch bản gây lỗi có chủ đích ở cấp độ node và broker.  

4. Giải pháp kiến trúc và mô hình thiết kế  
Kiến trúc tổng thể của hệ thống được xây dựng theo mô hình hướng sự kiện với Kafka cụm nhiều broker đóng vai trò là nền tảng truyền tải trung tâm giữa các dịch vụ.  
Các dịch vụ được container hóa và triển khai trên Kubernetes hoặc k3s, cho phép nhân bản độc lập trên nhiều node. Dịch vụ xử lý đơn hàng thực hiện ghi dữ liệu nghiệp vụ và dữ liệu sự kiện vào cơ sở dữ liệu trong cùng một giao dịch cục bộ thông qua cơ chế Transactional Outbox. Một tiến trình trung gian chịu trách nhiệm đọc dữ liệu từ bảng Outbox và chuyển tiếp sự kiện tới Kafka.  
Các dịch vụ xử lý thanh toán và quản lý tồn kho tiếp nhận sự kiện từ Kafka và thực hiện xử lý theo cơ chế bất biến nhằm đảm bảo cùng một sự kiện được phát lại nhiều lần vẫn tạo ra cùng một kết quả cuối cùng. Mỗi sự kiện được gắn một mã định danh duy nhất để phục vụ cho việc phát hiện và loại bỏ các yêu cầu xử lý trùng lặp.  
Hệ thống đồng thời triển khai cơ chế Retry kết hợp với chiến lược tăng dần thời gian chờ đối với các lỗi tạm thời. Những thông điệp không thể xử lý thành công sau số lần thử tối đa sẽ được chuyển tới Dead Letter Queue nhằm tránh ảnh hưởng đến quá trình xử lý của các thông điệp khác.  
Phần dữ liệu đọc được xây dựng theo mô hình CQRS ở mức đơn giản thông qua các projection được cập nhật từ luồng sự kiện và lưu trữ tại cơ sở dữ liệu phục vụ truy vấn trạng thái đơn hàng.  
Để phục vụ mục tiêu nghiên cứu, hệ thống được thiết kế theo hướng cho phép bật hoặc tắt từng cơ chế đảm bảo thông qua cấu hình nhằm đo lường riêng biệt chi phí hiệu năng của từng thành phần và đánh giá tác động của chúng tới toàn bộ hệ thống.  

5. Đề cương chi tiết dự kiến  

* Chương 1 trình bày cơ sở lý thuyết về kiến trúc hướng sự kiện, các mức đảm bảo phân phối thông điệp, bài toán đồng bộ dữ liệu và các cơ chế đảm bảo độ tin cậy trong hệ thống phân tán.  
* Chương 2 tập trung phân tích quy trình xử lý đơn hàng, thiết kế kiến trúc hệ thống, thiết kế lược đồ sự kiện và các cơ chế đảm bảo được sử dụng trong quá trình xử lý.  
* Chương 3 trình bày quá trình triển khai thực nghiệm, các kịch bản tạo tải, các kịch bản gây lỗi có chủ đích và kết quả đánh giá hiệu năng của hệ thống.  

6. Phương pháp thực nghiệm và đo lường hiệu năng  
Toàn bộ hệ thống được triển khai trên Kubernetes hoặc k3s với cụm Kafka nhiều broker và cấu hình tài nguyên được kiểm soát nhằm đảm bảo khả năng tái lập của kết quả thực nghiệm. Công cụ k6 được sử dụng để sinh tải và mô phỏng số lượng lớn yêu cầu đặt hàng đồng thời.  
Quá trình thực nghiệm được chia thành hai nhóm chính:  

* Nhóm thứ nhất tập trung đánh giá chi phí hiệu năng của từng cơ chế đảm bảo thông qua các chỉ số như thông lượng xử lý, độ trễ trung bình, độ trễ p95, độ trễ p99, tỷ lệ lỗi và mức tiêu thụ tài nguyên hệ thống.  
* Nhóm thứ hai tập trung đánh giá mức độ đảm bảo của hệ thống thông qua các kịch bản sự cố như ngắt dịch vụ tiêu thụ, gián đoạn hệ thống thông điệp, tắt node hoặc broker.  

7. Sản phẩm dự kiến bàn giao  

1. Mã nguồn hệ thống prototype bao gồm các microservice, cơ chế Transactional Outbox, Projection Worker và luồng xử lý đồng bộ tham chiếu.  
2. Bộ công cụ thực nghiệm bao gồm kịch bản sinh tải, kịch bản gây lỗi có chủ đích và hệ thống giám sát.  
3. Tập dữ liệu kết quả đo lường và các biểu đồ phân tích hiệu năng.  
4. Tài liệu thiết kế kỹ thuật và hướng dẫn tái lập môi trường thực nghiệm.  
5. Bản luận văn hoàn chỉnh trình bày toàn bộ quá trình nghiên cứu, triển khai và đánh giá kết quả.  

8. Hướng phát triển  

* Bổ sung Event Sourcing cho dịch vụ xử lý đơn hàng và đánh giá chi phí của việc lưu trữ trạng thái dưới dạng chuỗi sự kiện.  
* Bổ sung các cơ chế điều phối giao dịch phân tán và giao dịch bù trừ.  
* So sánh kết quả thực nghiệm trên các nền tảng truyền tải sự kiện khác nhau hoặc trên môi trường điện toán đám mây.